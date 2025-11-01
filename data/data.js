// data/data.js
// export simple users for mock auth
module.exports.users = [
  { id: 'u1', username: 'alice', name: 'Alice Admin', role: 'Admin' },
  { id: 'u2', username: 'mike', name: 'Mike Manager', role: 'Manager' },
  { id: 'u3', username: 'victor', name: 'Victor Viewer', role: 'Viewer' }
];

/*
Notes:
- To simulate being a particular user, add ?user=alice or ?user=mike to URL.
- The app will default to the first user (alice).
*/
