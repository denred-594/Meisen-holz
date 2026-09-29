import "dotenv/config";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { pgPoolInstance } from "@/server/db";

const EMAIL = process.env.ADMIN_EMAIL || "info@holz-meisen.de";
const PASSWORD = process.env.ADMIN_PASSWORD || "MeisenMeisenMeisen1!";

async function run() {
  const existing = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, EMAIL),
  });

  if (existing) {
    console.log(`Benutzer ${EMAIL} existiert bereits (id ${existing.id})`);
  } else {
    await auth.api.signUpEmail({
      body: { email: EMAIL, password: PASSWORD, name: "Test" },
    });
    console.log(`Benutzer ${EMAIL} angelegt (Passwort: ${PASSWORD})`);
  }

  await pgPoolInstance.end();
}

run().catch(async (error) => {
  console.error(error);
  await pgPoolInstance.end();
  process.exit(1);
});
