// app.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const { users } = require('./data/data');

const MODELS_DIR = path.join(__dirname, 'models');
const DATA_DIR = path.join(__dirname, 'data');

fs.ensureDirSync(MODELS_DIR);
fs.ensureDirSync(DATA_DIR);

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Simple "auth" helper: pick user by ?user=<username>
app.use((req, res, next) => {
  const username = req.query.user || req.cookies?.user || req.headers['x-user'];
  req.currentUser = users.find(u => u.username === username) || users[0]; // default to first user
  res.locals.currentUser = req.currentUser;
  next();
});

// In-memory registry of models (loaded from /models/*.json)
const modelRegistry = {};

// util: load model file
async function loadModels() {
  const files = await fs.readdir(MODELS_DIR);
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const content = await fs.readJSON(path.join(MODELS_DIR, f));
    registerModel(content); // will mount routes
  }
}

// utility: table name default
function defaultTableName(name) {
  return name.toLowerCase() + 's';
}

// Save model file atomically
async function saveModelFile(model) {
  const filePath = path.join(MODELS_DIR, `${model.name}.json`);
  const tmp = filePath + '.tmp';
  await fs.writeJSON(tmp, model, { spaces: 2 });
  await fs.move(tmp, filePath, { overwrite: true });
}

// Ensure data file exists for model
async function ensureDataFile(tableName) {
  const file = path.join(DATA_DIR, `${tableName}.json`);
  if (!await fs.pathExists(file)) {
    await fs.writeJSON(file, [], { spaces: 2 });
  }
  return file;
}

// basic RBAC check middleware factory
function checkRBAC(model, operation) {
  return async (req, res, next) => {
    const role = req.currentUser.role;
    const allowed = (model.rbac && model.rbac[role]) || [];
    if (allowed.includes('all') || allowed.includes(operation)) {
      // ownership check for update/delete
      if ((operation === 'update' || operation === 'delete') && model.ownerField) {
        if (role === 'Admin') return next();
        const id = req.params.id;
        const dataFile = path.join(DATA_DIR, `${model.tableName}.json`);
        const items = await fs.readJSON(dataFile);
        const record = items.find(it => it.id === id);
        if (!record) return res.status(404).send('Record not found');
        if (record[model.ownerField] !== req.currentUser.id) {
          return res.status(403).send('Forbidden: not owner');
        }
      }
      return next();
    }
    return res.status(403).send('Forbidden: RBAC denies this operation');
  };
}

// register model: create Express Router for CRUD and mount EJS-backed routes
function registerModel(model) {
  const tableName = model.tableName || defaultTableName(model.name);
  model.tableName = tableName; // ensure field populated

  // prevent duplicate registration
  if (modelRegistry[model.name]) {
    console.log(`Model ${model.name} already registered; skipping.`);
    return;
  }

  const router = express.Router();

  // (A) Admin listing (render records list)
  router.get('/', checkRBAC(model, 'read'), async (req, res) => {
    const file = await ensureDataFile(tableName);
    const items = await fs.readJSON(file);
    res.render('listings/list', { model, items });
  });

  // (B) new form
  router.get('/new', checkRBAC(model, 'create'), async (req, res) => {
    res.render('listings/form', { model, item: null, action: `/${tableName}` });
  });

  // (C) create
  router.post('/', checkRBAC(model, 'create'), async (req, res) => {
    const file = await ensureDataFile(tableName);
    const items = await fs.readJSON(file);
    const id = uuidv4();
    const item = { id };
    // fill fields, apply defaults
    for (const f of model.fields) {
      const val = req.body[f.name];
      if (val === undefined || val === '') {
        if (f.default !== undefined) item[f.name] = f.default;
        else item[f.name] = null;
      } else {
        // basic typecasting
        if (f.type === 'number') item[f.name] = Number(val);
        else if (f.type === 'boolean') item[f.name] = (val === 'on' || val === 'true' || val === true);
        else item[f.name] = val;
      }
    }
    // if ownerField present and current user, set it if not provided
    if (model.ownerField && !item[model.ownerField]) {
      item[model.ownerField] = req.currentUser.id;
    }
    items.push(item);
    await fs.writeJSON(file, items, { spaces: 2 });
    res.redirect(`/listings/${tableName}?user=${req.currentUser.username}`);
  });

  // (D) show single
  router.get('/:id', checkRBAC(model, 'read'), async (req, res) => {
    const file = await ensureDataFile(tableName);
    const items = await fs.readJSON(file);
    const item = items.find(it => it.id === req.params.id);
    if (!item) return res.status(404).send('Not found');
    res.render('listings/show', { model, item });
  });

  // (E) edit form
  router.get('/:id/edit', checkRBAC(model, 'update'), async (req, res) => {
    const file = await ensureDataFile(tableName);
    const items = await fs.readJSON(file);
    const item = items.find(it => it.id === req.params.id);
    if (!item) return res.status(404).send('Not found');
    res.render('listings/form', { model, item, action: `/${tableName}/${item.id}?_method=PUT` });
  });

  // (F) update
  router.put('/:id', checkRBAC(model, 'update'), async (req, res) => {
    const file = await ensureDataFile(tableName);
    const items = await fs.readJSON(file);
    const idx = items.findIndex(it => it.id === req.params.id);
    if (idx === -1) return res.status(404).send('Not found');
    const item = items[idx];
    for (const f of model.fields) {
      const val = req.body[f.name];
      if (val === undefined || val === '') {
        // leave existing or set default only if not present
        if (item[f.name] === undefined && f.default !== undefined) item[f.name] = f.default;
      } else {
        if (f.type === 'number') item[f.name] = Number(val);
        else if (f.type === 'boolean') item[f.name] = (val === 'on' || val === 'true' || val === true);
        else item[f.name] = val;
      }
    }
    items[idx] = item;
    await fs.writeJSON(file, items, { spaces: 2 });
    res.redirect(`/listings/${tableName}?user=${req.currentUser.username}`);
  });

  // (G) delete
  router.delete('/:id', checkRBAC(model, 'delete'), async (req, res) => {
    const file = await ensureDataFile(tableName);
    let items = await fs.readJSON(file);
    items = items.filter(it => it.id !== req.params.id);
    await fs.writeJSON(file, items, { spaces: 2 });
    res.redirect(`/listings/${tableName}?user=${req.currentUser.username}`);
  });

  // Mount router under /listings/<tableName>
  app.use(`/listings/${tableName}`, router);

  // Also create a JSON API (optional)
  const apiRouter = express.Router();
  apiRouter.get('/', checkRBAC(model, 'read'), async (req, res) => {
    const file = await ensureDataFile(tableName);
    const items = await fs.readJSON(file);
    res.json(items);
  });
  apiRouter.get('/:id', checkRBAC(model, 'read'), async (req, res) => {
    const file = await ensureDataFile(tableName);
    const items = await fs.readJSON(file);
    const item = items.find(it => it.id === req.params.id);
    if (!item) return res.status(404).send('Not found');
    res.json(item);
  });
  apiRouter.post('/', checkRBAC(model, 'create'), async (req, res) => {
    const file = await ensureDataFile(tableName);
    const items = await fs.readJSON(file);
    const id = uuidv4();
    const item = { id };
    for (const f of model.fields) {
      const val = req.body[f.name];
      item[f.name] = val === undefined ? (f.default ?? null) : val;
    }
    if (model.ownerField && !item[model.ownerField]) item[model.ownerField] = req.currentUser.id;
    items.push(item);
    await fs.writeJSON(file, items, { spaces: 2 });
    res.status(201).json(item);
  });
  apiRouter.put('/:id', checkRBAC(model, 'update'), async (req, res) => {
    const file = await ensureDataFile(tableName);
    const items = await fs.readJSON(file);
    const idx = items.findIndex(it => it.id === req.params.id);
    if (idx === -1) return res.status(404).send('Not found');
    const item = items[idx];
    for (const f of model.fields) {
      if (req.body[f.name] !== undefined) item[f.name] = req.body[f.name];
    }
    items[idx] = item;
    await fs.writeJSON(file, items, { spaces: 2 });
    res.json(item);
  });
  apiRouter.delete('/:id', checkRBAC(model, 'delete'), async (req, res) => {
    const file = await ensureDataFile(tableName);
    let items = await fs.readJSON(file);
    items = items.filter(it => it.id !== req.params.id);
    await fs.writeJSON(file, items, { spaces: 2 });
    res.status(204).send();
  });

  app.use(`/api/${tableName}`, apiRouter);

  modelRegistry[model.name] = model;
  console.log(`Registered model ${model.name} (${tableName})`);
}

// Admin UI: home page shows model list and model editor
app.get('/', async (req, res) => {
  // list model files
  const files = await fs.readdir(MODELS_DIR);
  const models = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    models.push(await fs.readJSON(path.join(MODELS_DIR, f)));
  }
  res.render('layout', { models });
});

// Admin endpoint to publish a model (POST)
app.post('/admin/publish', async (req, res) => {
  /*
    expected body:
    {
      name: 'Product',
      tableName: 'products',
      ownerField: 'ownerId',
      fields: [ {name,type,required,default,unique}, ... ],
      rbac: { Admin: ['all'], Manager: ['create','read'], Viewer: ['read'] }
    }
  */
  const raw = req.body;
  const model = {
    name: raw.name,
    tableName: raw.tableName || defaultTableName(raw.name),
    fields: [],
    ownerField: raw.ownerField || null,
    rbac: raw.rbac || { Admin: ['all'], Manager: ['create','read','update'], Viewer: ['read'] }
  };

  // parse fields from form (fields come as arrays)
  if (raw['field_name[]']) {
    const names = Array.isArray(raw['field_name[]']) ? raw['field_name[]'] : [raw['field_name[]']];
    const types = Array.isArray(raw['field_type[]']) ? raw['field_type[]'] : [raw['field_type[]']];
    const reqs = Array.isArray(raw['field_required[]']) ? raw['field_required[]'] : [raw['field_required[]']];
    const defs = Array.isArray(raw['field_default[]']) ? raw['field_default[]'] : [raw['field_default[]']];
    for (let i = 0; i < names.length; i++) {
      model.fields.push({
        name: names[i],
        type: types[i] || 'string',
        required: reqs[i] === 'on' || reqs[i] === 'true',
        default: defs[i] !== '' ? defs[i] : undefined
      });
    }
  } else if (raw.fields) {
    model.fields = raw.fields;
  }

  // save file
  await saveModelFile(model);
  // ensure data file exists
  await ensureDataFile(model.tableName);
  // register model dynamically (so endpoints available immediately)
  registerModel(model);

  res.redirect(`/?user=${req.currentUser.username}`);
});

// simple login UI endpoint (choose user)
app.get('/login', (req, res) => {
  res.render('includes/header', { users }); // quick redirect to header page with user list
});

// load existing models on startup
(async () => {
  await loadModels();
})();

module.exports = app;
