type ENV = {
  BLOG_POSTS_VISITS: KVNamespace;
  FINTOC_URL?: string;
};

declare namespace App {
  interface Locals {
    runtime: {
      env: ENV;
    };
  }
}
