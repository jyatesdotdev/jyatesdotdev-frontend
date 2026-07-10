import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("blog", "routes/blog.tsx"),
  route("blog/:slug", "routes/post.tsx"),
  route("career", "routes/career.tsx"),
  route("projects", "routes/projects.tsx"),
  route("library", "routes/library.tsx"),
  route("contact", "routes/contact.tsx"),
  route("subscribe/confirm", "routes/subscribe-confirm.tsx"),
  route("admin", "routes/admin.tsx"),
  route("*", "routes/not-found.tsx")
] satisfies RouteConfig;
