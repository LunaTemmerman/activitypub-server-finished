function translateNoteToActivity(post) {
  const activity = {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: post.id,
    type: post.type,
    content: post.content,
    attributedTo: post.attributedTo,
    to: post.to,
    cc: post.cc,
  };
  return activity;
}

function translateCreateToActivity(post) {
  const activity = {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: post.id,
    type: post.type,
    actor: post.actor,
    object: translateNoteToActivity(post.object),
    to: post.object.to,
    cc: post.object.cc,
  };
  return activity;
}

export {translateNoteToActivity, translateCreateToActivity};
