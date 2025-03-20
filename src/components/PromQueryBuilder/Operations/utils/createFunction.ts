import { PromVisualQueryOperationCategory, QueryBuilderOperationDef } from '../../types';
import { getPromOperationDisplayName, getPromOperationDisplayLabel } from './index';
import { functionRendererRight, functionRendererLeft } from './renderer';
import { defaultAddOperationHandler } from './addOperationHandler';

export function createFunction(definition: Partial<QueryBuilderOperationDef>): QueryBuilderOperationDef {
  return {
    ...definition,
    id: definition.id!,
    name: definition.name ?? getPromOperationDisplayName(definition.id!),
    label: getPromOperationDisplayLabel(definition.id!),
    params: definition.params ?? [],
    defaultParams: definition.defaultParams ?? [],
    category: definition.category ?? PromVisualQueryOperationCategory.Functions,
    renderer: definition.renderer ?? (definition.params ? functionRendererRight : functionRendererLeft),
    addOperationHandler: definition.addOperationHandler ?? defaultAddOperationHandler,
  };
}
