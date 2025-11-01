// import fs from "fs";
// import path from "path";

// export function publishModel(model: any) {
//   const modelPath = path.join(__dirname, "models", `${model.name}.json`);
//   fs.writeFileSync(modelPath, JSON.stringify(model, null, 2));

//   const prismaModel = `
// model ${model.name} {
//   id Int @id @default(autoincrement())
//   ${model.fields
//     .map(
//       f =>
//         `${f.name} ${f.type === "string" ? "String" : f.type === "number" ? "Float" : "Boolean"} ${
//           f.required ? "" : "?"
//         }`
//     )
//     .join("\n  ")}
// }
// `;

//   fs.appendFileSync("prisma/schema.prisma", prismaModel);

//   console.log(`✅ Model ${model.name} added to schema.prisma`);
// }
