/**
 * @license GPL-3.0
 * Copyright (C) 2024-2025 SilverHack3d <silverhack3d@gmail.com>
 */

import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST")
		return res.status(405).json({ error: "Method not allowed" });

	res.setHeader("Set-Cookie", [
		"oauth_token=; Path=/; HttpOnly; Secure; Max-Age=0",
		"oauth_token_secret=; Path=/; HttpOnly; Secure; Max-Age=0",
	]);

	res.status(200).json({ success: true });
}
