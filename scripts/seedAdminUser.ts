import "dotenv/config";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";

async function run() {
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, "test@test.test"),
  });

  if (!user) {
    await auth.api.signUpEmail({
      body: {
        email: "info@holz-meisen.de",
        password: "Meisen",
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
