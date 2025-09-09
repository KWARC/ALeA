import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const quizDir = process.env.OLD_QUIZ_DIR;
    const semester = req.query.semester as string;
    const filename = req.query.filename as string;
    if (!quizDir || !semester || !filename) {
        return res.status(400).json({ error: "Missing parameters" });
    }

    const filePath = path.join(quizDir, semester, filename);
    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "File not found" });
        }
        const content = fs.readFileSync(filePath, "utf-8");
        const json = JSON.parse(content);
        res.status(200).json(json);
    } catch (e) {
        res.status(500).json({ error: "Failed to read or parse file" });
    }
}