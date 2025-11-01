const express = require("express");
const router = express.Router();
const controller = require("../controllers/user.controller");

router.get("/", controller.list);
router.get("/new", controller.createForm);
router.post("/new", controller.create);
router.get("/:id/edit", controller.editForm);
router.post("/:id/edit", controller.update);
router.post("/:id/delete", controller.remove);

module.exports = router;
