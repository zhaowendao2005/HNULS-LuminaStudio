# OrchestraFlow �ӽ��̵���

���������򿪷��ߵ�����ʽ README���ص�˵����

- Ӧ���ȿ���Щ�ļ�
- ÿ���ļ�����ʲô
- ���˳��һ���������У�run/progress/result/stop���������

## ģ�鷶Χ

Ŀ¼��`src/utility/orchestraflow`

��Ŀ¼������ Electron Utility Process���ӽ��̣��У�����ִ���� Main �����·��Ĺ�������

## ����ӽ�����ʲô

1. ���� Main ������Ϣ��`run`��`stop`��`init`��`shutdown`����
2. ������˳��ִ�й������ڵ㡣
3. ���ڵ�ʵʱ�ϱ�ִ�н��ȡ�
4. ��������ִ�н�������
5. ��������ά�����������ģ�ʵ�ֽڵ�����ݴ��ݡ�

## �Ƽ��Ķ�˳�����ˣ�

1. `messages.types.ts`
   ԭ�������� Main �� Utility ֮�����Ϣ��Լ���ٿ�ִ���߼����������

2. `entry.ts`
   ԭ���ӽ�����ڣ�������Ϣ��������־ת�����ַ�����������

3. `manager/workflow-instance-manager.ts`
   ԭ��ִ�к��ģ�����ʵ���������ڡ��������򡢽��Ȼ㱨������װ��

4. `services/executor.ts`
   ԭ�򣺵��ڵ�ִ������㣬����ִ�������Ĳ�ί�ɸ� NodeFactory��

5. `nodes/node-factory.ts`
   ԭ�򣺰ѽڵ����ͷַ�������ʵ�֣�`start`��`llm`��`end`����

6. `nodes/base-node.ts` + ������ڵ�
   ԭ��������ҵ����Ϊ���壺

- `start-node.ts`����ȡ��������ʼ�������
- `llm-node.ts`������ģ�Ͳ�ӳ���������
- `end-node.ts`���� selector �����������

7. `services/variable-store.ts`
   ԭ������ʱ�������ߣ����������д�� selector ȡֵ��

## ������������

### 1) �ӽ�������

- `entry.ts` ��� `process.parentPort`��
- ���� `process:ready`��
- ע����Ϣ���������� Main -> Utility ָ�

### 2) ���й�������run��

- Main ���� `workflow:run`���� `runId`��workflow ͼ��inputs��providerConfigs����
- `WorkflowInstanceManager.runWorkflow()`��
  - ��������ʵ��
  - �Խڵ���������
  - ˳��ִ��ÿ���ڵ�
  - ÿ���ڵ�ǰ���� `workflow:progress`
  - ��һ�ڵ�ʧ��������ʧ��

### 3) �����ϱ���progress��

- �����غ�Ϊ `OFNodeTracing`��
- ÿ���ڵ�ᾭ��״̬�仯��`running` -> `succeeded/failed`����

### 4) ���ؽ����result��

- ���������� `OFWorkflowRunResult`��������
  - ������״̬
  - �ܺ�ʱ
  - tracing �б�
  - ���� outputs��ͨ���� End �ڵ���ܣ�
  - error��ʧ��ʱ��
- `entry.ts` �ط� `workflow:result` �� `workflow:error`��

### 5) ִֹͣ�У�stop��

- Main ���� `workflow:stop`��
- ��������ʵ��״̬���Ϊ `stopped`��
- ִ��ѭ�����ڽڵ�߽���״̬����ǰ�˳���

## ��Ϣ��Լ�ٲ�

Main -> Utility��`MainToOFMessage`����

- `process:init`
- `process:shutdown`
- `workflow:run`
- `workflow:stop`

Utility -> Main��`OFToMainMessage`����

- `process:ready`
- `process:error`
- `process:log`
- `workflow:progress`
- `workflow:result`
- `workflow:error`

�����`messages.types.ts`

## �ļ�ְ���ͼ

- `entry.ts`���ӽ����������Ϣ�ַ�
- `messages.types.ts`���������Ϣ����
- `manager/workflow-instance-manager.ts`��������ʵ����������������
- `services/executor.ts`�����ڵ�ִ������
- `services/variable-store.ts`������ʱ�����洢�� selector ����
- `nodes/base-node.ts`���ڵ�������
- `nodes/node-factory.ts`���ڵ����ͷַ�����
- `nodes/start-node.ts`��Start �ڵ��߼�
- `nodes/llm-node.ts`��LLM �ڵ��߼�
- `nodes/end-node.ts`��End �ڵ��߼�
- `nodes/types.ts`��ִ����������������

## �� Main/Renderer ���ν�λ��

��Ŀ¼������ Utility ��ʵ�֡�ȫ��·��λ�뿴��

1. Main �ӽ����Žӣ�

- `src/main/services/orchestraflow-bridge/orchestraflow-bridge-service.ts`

2. Main IPC ��ڣ�

- `src/main/ipc/orchestraflow-handler.ts`

3. Preload API ��¶��

- `src/preload/api/orchestraflow-api.ts`

4. Renderer ״̬��ҳ�棺

- `src/renderer/src/stores/orchestraflow/*`
- `src/renderer/src/views/LuminaApp/Maincontent/OrchestraFlowView/*`

## ��չ���콨�飨��С�Ķ���

����Ҫ������������ʱ�����鰴����˳��

1. �ȸĹ������ͣ�`src/Public/ShareTypes/Orchestraflow-types`����
2. �ٸ� Utility �ġ������㡱�ļ���manager/executor/nodes�����������Ѹ��ֶε�λ�á�
3. ͸���㣨preload re-export / bridge ӳ�䣩�����ٸġ�
4. ʼ�ռ�� `messages.types.ts` �� Main bridge/handler ����Ϣ�����ԡ�

## ʵ�õ��Խ���

1. �� `entry.ts` �� `process:log` ת����־���֣����ӽ���ʵ����Ϊ��
2. �۲� `workflow:progress` �ɿ��ٶ�λʧ�ܽڵ㡣
3. �������������ȼ�飺`VariableStore.getBySelector()` ��ڵ�����������Ƿ�һ�¡�
4. ģ�͵����������ȼ�飺`llm-node.ts` �� provider ���ý����� API key/baseUrl��

## ˵��

���Ļ��ڱ��ش���׷�٣������ Devin �ֿ���н��������
