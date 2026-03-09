import fs from 'fs'
import path from 'path'
import ts from 'typescript'

const projectRoot = process.cwd()
const entryFile = path.resolve(projectRoot, 'src/Public/ShareTypes/Orchestraflow-types/index.ts')
const outputFile = path.resolve(
  projectRoot,
  'src/utility/orchestraflow/ai-schema/generated-runnable-schema.ts'
)
const targetSymbolName = 'OFRunnableWorkflow'

function loadProgram() {
  const configPath = path.resolve(projectRoot, 'tsconfig.node.json')
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  if (configFile.error) {
    throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'))
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath))
  return ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options
  })
}

function getExportedType(checker, sourceFile, exportName) {
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile)
  if (!moduleSymbol) {
    throw new Error(`Unable to resolve module symbol for ${sourceFile.fileName}`)
  }
  const exportSymbol = checker.getExportsOfModule(moduleSymbol).find((item) => item.name === exportName)
  if (!exportSymbol) {
    throw new Error(`Unable to find exported symbol ${exportName}`)
  }
  const symbol = exportSymbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exportSymbol) : exportSymbol
  return checker.getDeclaredTypeOfSymbol(symbol)
}

function createConverter(checker) {
  const visiting = new WeakSet()

  function convertType(type) {
    if (checker.isArrayType(type)) {
      const itemType = checker.getTypeArguments(type)[0] || checker.getAnyType()
      return {
        type: 'array',
        items: convertType(itemType)
      }
    }

    if (checker.isTupleType(type)) {
      const tupleItems = checker.getTypeArguments(type)
      return {
        type: 'array',
        minItems: tupleItems.length,
        prefixItems: tupleItems.map((item) => convertType(item))
      }
    }

    if (type.flags & ts.TypeFlags.String) return { type: 'string' }
    if (type.flags & ts.TypeFlags.Number) return { type: 'number' }
    if (type.flags & ts.TypeFlags.Boolean) return { type: 'boolean' }
    if (type.flags & ts.TypeFlags.Any || type.flags & ts.TypeFlags.Unknown) return {}
    if (type.flags & ts.TypeFlags.StringLiteral) return { const: type.value }
    if (type.flags & ts.TypeFlags.NumberLiteral) return { const: type.value }
    if (type.flags & ts.TypeFlags.BooleanLiteral) {
      return { const: checker.typeToString(type) === 'true' }
    }

    if (type.isUnion()) {
      const members = type.types.filter(
        (item) => !(item.flags & ts.TypeFlags.Undefined) && !(item.flags & ts.TypeFlags.Null)
      )
      if (members.every((item) => item.isStringLiteral?.())) {
        return { type: 'string', enum: members.map((item) => item.value) }
      }
      if (members.every((item) => item.isNumberLiteral?.())) {
        return { type: 'number', enum: members.map((item) => item.value) }
      }
      return { oneOf: members.map((item) => convertType(item)) }
    }

    if (type.isIntersection()) {
      const objectSchemas = type.types.map((item) => convertType(item))
      const properties = {}
      const required = new Set()
      let additionalProperties = false

      objectSchemas.forEach((item) => {
        if (item.properties) {
          Object.assign(properties, item.properties)
        }
        if (Array.isArray(item.required)) {
          item.required.forEach((field) => required.add(field))
        }
        if (item.additionalProperties !== false) {
          additionalProperties = item.additionalProperties || true
        }
      })

      return {
        type: 'object',
        properties,
        required: [...required],
        additionalProperties
      }
    }

    if (visiting.has(type)) {
      return {}
    }
    visiting.add(type)

    const properties = {}
    const required = []
    const stringIndexType = checker.getIndexTypeOfType(type, ts.IndexKind.String)

    checker.getPropertiesOfType(type).forEach((symbol) => {
      const declaration = symbol.valueDeclaration || symbol.declarations?.[0]
      const propertyType = checker.getTypeOfSymbolAtLocation(symbol, declaration)
      properties[symbol.name] = convertType(propertyType)
      const isOptional = (symbol.flags & ts.SymbolFlags.Optional) !== 0
      if (!isOptional) {
        required.push(symbol.name)
      }
    })

    visiting.delete(type)

    const schema = {
      type: 'object',
      properties,
      required,
      additionalProperties: stringIndexType ? convertType(stringIndexType) : false
    }

    if (!required.length) {
      delete schema.required
    }

    return schema
  }

  return {
    convertRoot(type) {
      return convertType(type)
    }
  }
}

function main() {
  const program = loadProgram()
  const checker = program.getTypeChecker()
  const sourceFile = program.getSourceFile(entryFile)
  if (!sourceFile) {
    throw new Error(`Unable to load source file: ${entryFile}`)
  }

  const rootType = getExportedType(checker, sourceFile, targetSymbolName)
  const converter = createConverter(checker)
  const schemaDocument = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'orchestraflow-runnable-workflow.schema.json',
    title: 'OrchestraFlow Runnable Workflow',
    description: '由共享类型自动派生的可运行工作流结构 schema。',
    ...converter.convertRoot(rootType)
  }

  const fileContent = `// Auto-generated by scripts/generate-orchestraflow-runnable-schema.mjs\n` +
    `// Do not edit manually.\n` +
    `export const GENERATED_RUNNABLE_WORKFLOW_SCHEMA = ${JSON.stringify(schemaDocument, null, 2)} as const\n`

  fs.writeFileSync(outputFile, fileContent, 'utf8')
  console.log(`Generated ${path.relative(projectRoot, outputFile)}`)
}

main()
