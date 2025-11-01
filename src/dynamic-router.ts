// import express from "express";
// import prisma from "@prisma/client";
// import fs from "fs";
// import path from "path";
// import { rbacMiddleware } from "./rbac";

// const { PrismaClient } = prisma;
// const db = new PrismaClient();

// export function loadDynamicModels(app: express.Express) {
//   const modelsPath = path.join(__dirname, "models");
//   const modelFiles = fs.readdirSync(modelsPath);

//   modelFiles.forEach(file => {
//     const model = JSON.parse(fs.readFileSync(path.join(modelsPath, file), "utf8"));
//     const router = express.Router();
//     const modelName = model.name;
//     const table = modelName;

//     // CREATE
//     router.post("/", rbacMiddleware(model.rbac.create), async (req, res) => {
//       const result = await (db as any)[table].create({ data: req.body });
//       res.json(result);
//     });

//     // READ ALL
//     router.get("/", rbacMiddleware(model.rbac.read), async (_, res) => {
//       const result = await (db as any)[table].findMany();
//       res.json(result);
//     });

//     // READ BY ID
//     router.get("/:id", rbacMiddleware(model.rbac.read), async (req, res) => {
//       const result = await (db as any)[table].findUnique({
//         where: { id: Number(req.params.id) },
//       });
//       res.json(result);
//     });

//     // UPDATE
//     router.put("/:id", rbacMiddleware(model.rbac.update), async (req, res) => {
//       const result = await (db as any)[table].update({
//         where: { id: Number(req.params.id) },
//         data: req.body,
//       });
//       res.json(result);
//     });

//     // DELETE
//     router.delete("/:id", rbacMiddleware(model.rbac.delete), async (req, res) => {
//       const result = await (db as any)[table].delete({
//         where: { id: Number(req.params.id) },
//       });
//       res.json(result);
//     });

//     app.use(`/api/${modelName.toLowerCase()}s`, router);

//     console.log(`✅ CRUD Routes ready for ${modelName}`);
//   });
// }
