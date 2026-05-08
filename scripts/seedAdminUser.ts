import "dotenv/config";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schemas";
import { eq } from "drizzle-orm";

async function run() {
  const email = process.env.ADMIN_EMAIL ?? "info@holz-meisen.de";
  const password = process.env.ADMIN_PASSWORD ?? "MeisenMeisenMeisen1!";
  const shouldReset = process.env.ADMIN_RESET === "true";

  if (password.length < 16) {
    throw new Error("ADMIN_PASSWORD must be at least 16 characters long.");
  }

  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, email),
  });

  if (user && shouldReset) {
    await db.delete(users).where(eq(users.email, email));
  }

  if (!user || shouldReset) {
    await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: "Meisen",
      },
    });
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
