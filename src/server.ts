// import express from "express";
// import bodyParser from "body-parser";
// import { publishModel } from "./model-loader";
// import { loadDynamicModels } from "./dynamic-router";

// const app = express();
// app.use(bodyParser.json());

// // Endpoint to publish model
// app.post("/publish-model", (req, res) => {
//   publishModel(req.body);
//   res.json({ message: "Model published. Run: prisma migrate dev" });
// });

// // Load all models & auto-generate routes
// loadDynamicModels(app);

// // Start Server
// app.listen(4000, () => console.log("🚀 Server running on http://localhost:4000"));
