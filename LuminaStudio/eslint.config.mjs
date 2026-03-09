import { defineConfig } from 'eslint/config'
import tseslint from '@electron-toolkit/eslint-config-ts'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import eslintPluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import orchestraflowPlugin from './scripts/eslint/orchestraflow-plugin.mjs'

export default defineConfig(
  { ignores: ['**/node_modules', '**/dist', '**/out'] },
  tseslint.configs.recommended,
  eslintPluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },
        extraFileExtensions: ['.vue'],
        parser: tseslint.parser
      }
    }
  },
  {
    files: ['**/*.{ts,mts,tsx,vue}'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      'no-undef': 'off',
      'vue/require-default-prop': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/block-lang': [
        'error',
        {
          script: {
            lang: 'ts'
          }
        }
      ],
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off'
    }
  },
  {
    files: [
      'src/preload/types/**/*.{ts,tsx}',
      'src/main/services/**/*.{ts,tsx}',
      'src/Public/ShareTypes/**/*.{ts,tsx}'
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx}', '**/*.mock.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off'
    }
  },
  {
    files: ['scripts/**/*.{js,mjs,ts}'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-control-regex': 'off',
      'no-empty': 'off'
    }
  },
  {
    files: ['src/**/*.{ts,mts,tsx,vue,js,mjs}'],
    plugins: {
      orchestraflow: orchestraflowPlugin
    },
    rules: {
      'orchestraflow/no-legacy-entrypoints': 'error',
      'orchestraflow/prefer-shared-barrel-api': 'error',
      'orchestraflow/no-business-branch-outside-definitions': 'error',
      'orchestraflow/no-manual-derived-node-fields': 'error'
    }
  },
  {
    files: ['**/*.vue'],
    rules: {
      'vue/no-unused-vars': 'warn'
    }
  },
  eslintConfigPrettier
)
