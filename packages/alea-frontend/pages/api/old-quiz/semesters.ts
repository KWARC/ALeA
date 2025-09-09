import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const quizDir = process.env.OLD_QUIZ_DIR;
    console.log({ quizDir });
    if (!quizDir) return res.status(500).json({ error: "OLD_QUIZ_DIR not set" });

    try {
        const semesters = fs.readdirSync(quizDir).filter(name =>
            fs.statSync(path.join(quizDir, name)).isDirectory()
        );
        res.status(200).json(semesters);
    } catch (e) {
        res.status(500).json({ error: "Failed to read semesters" });
    }
}