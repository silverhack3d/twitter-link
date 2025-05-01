/**
 * @license GPL-3.0
 * Copyright (C) 2024-2025 SilverHack3d <silverhack3d@gmail.com>
 */

import { initDb } from "@/utils/db";

let initialized = false;

export async function initializeApp() {
	if (initialized) return;
	await initDb();
	initialized = true;
}
