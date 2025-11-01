export type ModelField = {
  name: string;
  type: "string" | "number" | "boolean";
  required?: boolean;
  default?: any;
  unique?: boolean;
};

export type ModelRBAC = {
  [role: string]: ("create" | "read" | "update" | "delete" | "all")[];
};

export interface DynamicModel {
  name: string;
  fields: ModelField[];
  ownerField?: string;
  rbac: ModelRBAC;
}
