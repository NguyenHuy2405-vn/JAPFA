import { z } from "zod";

export const createFarmSchema = z.object({
  farmCode: z
    .string()
    .min(3, "Mã farm phải có ít nhất 3 ký tự")
    .max(50, "Mã farm tối đa 50 ký tự")
    .regex(/^[A-Z0-9-]+$/, "Mã farm chỉ chứa chữ HOA, số và dấu gạch ngang"),
  farmName: z
    .string()
    .min(3, "Tên farm phải có ít nhất 3 ký tự")
    .max(200, "Tên farm tối đa 200 ký tự"),
  farmType: z.enum(["FARM", "FACTORY"], {
    message: "Loại farm phải là FARM hoặc FACTORY",
  }),
  address: z.string().max(500).optional(),
  phone: z
    .string()
    .regex(/^[0-9+\-\s()]*$/, "Số điện thoại không hợp lệ")
    .optional()
    .or(z.literal("")),
  adminEmail: z
    .string()
    .email("Email không hợp lệ")
    .max(200, "Email tối đa 200 ký tự"),
  adminFullName: z
    .string()
    .min(2, "Họ tên phải có ít nhất 2 ký tự")
    .max(200, "Họ tên tối đa 200 ký tự"),
  adminPhone: z
    .string()
    .regex(/^[0-9+\-\s()]*$/, "Số điện thoại không hợp lệ")
    .optional()
    .or(z.literal("")),
});

export type CreateFarmInput = z.infer<typeof createFarmSchema>;
