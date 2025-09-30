// // prisma.config.ts
// import { defineConfig } from "@prisma/config";

// export default defineConfig({
//   // @ts-expect-error -- seeds not yet typed in current Prisma version
//   seeds: {
//     "apps/admin-service/prisma/schema.prisma": {
//       run: async () => {
//         const { main } = await import("./apps/admin-service/prisma/seed.js");
//         await main();
//       },
//     },
//     "apps/auth-service/prisma/schema.prisma": {
//       run: async () => {
//         const { main } = await import("./apps/auth-service/prisma/seed");
//         await main();
//       },
//     },
//     "apps/user-service/prisma/schema.prisma": {
//       run: async () => {
//         const { main } = await import("./apps/user-service/prisma/seed.js");
//         await main();
//       },
//     },
//   },
// });
