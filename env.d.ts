type ENV = {
  BLOG_POSTS_VISITS: KVNamespace;
};

declare namespace App {
  interface Locals {
    runtime: {
      env: ENV;
    };
  }
}
