import { z } from "zod";
import { jsonError, jsonOk, parseBody, withProfile } from "@/lib/api";
import { setUserRole, type UserRole } from "@/lib/auth";
import { getEnv } from "@/lib/env";

const roleRequestSchema = z.object({
  role: z.enum(["student", "teacher", "admin"]),
  code: z.string().trim().min(1).optional(),
});

// Rank order: moving up requires the matching access code, staying put or
// moving down (including any downgrade to student) never does.
const ROLE_RANK: Record<UserRole, number> = { student: 0, teacher: 1, admin: 2 };

// POST /api/role: a signed-in user picks their own role. Upgrades to teacher
// or admin need ROLE_TEACHER_CODE or ROLE_ADMIN_CODE from the environment;
// the role is stored as a Firebase custom claim on the user.
export const POST = withProfile(async ({ request, identity }) => {
  const body = await parseBody(request, roleRequestSchema);

  if (ROLE_RANK[body.role] > ROLE_RANK[identity.role]) {
    const expected =
      body.role === "teacher" ? getEnv().roleTeacherCode : getEnv().roleAdminCode;
    if (!expected) {
      return jsonError(503, "Role codes are not configured");
    }
    if (body.code !== expected) {
      return jsonError(403, "That access code is not correct");
    }
  }

  await setUserRole(identity.uid, body.role);
  return jsonOk({ role: body.role });
});
