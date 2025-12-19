import fs from "fs";

export async function POST(request) {
  const { userID } = await request.json();
  const sessions = fs.readdirSync("./sessions");
  const sessionsData = sessions.map((session) => {
    const sessionData = fs.readFileSync(`./sessions/${session}`, "utf8");
    return JSON.parse(sessionData);
  });
  return Response.json({ sessions: sessionsData.filter((session) => session.userID === userID) });
}
