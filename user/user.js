const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.list = async (req, res) => {
  const users = await prisma.user.findMany();
  res.render("user/index", { users });
};

exports.createForm = (req, res) => {
  res.render("user/new");
};

exports.create = async (req, res) => {
  const { name, email } = req.body;
  await prisma.user.create({ data: { name, email } });
  res.redirect("/users");
};

exports.editForm = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) }});
  res.render("user/edit", { user });
};

exports.update = async (req, res) => {
  const { name, email } = req.body;
  await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { name, email },
  });
  res.redirect("/users");
};

exports.remove = async (req, res) => {
  await prisma.user.delete({ where: { id: Number(req.params.id) }});
  res.redirect("/users");
};
