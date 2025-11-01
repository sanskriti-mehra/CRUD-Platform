// import { Request, Response, NextFunction } from "express";

// export const rbacMiddleware = (allowed: string[]) => {
//   return (req: Request, res: Response, next: NextFunction) => {
//     const role = req.headers["role"] as string;

//     if (!allowed.some(a => a === "all" || a === role)) {
//       return res.status(403).json({ error: "Access denied" });
//     }

//     next();
//   };
// };
