/**
 * @license GPL-3.0
 * Copyright (C) 2024-2025 SilverHack3d <silverhack3d@gmail.com>
 */

import type { AppProps } from "next/app";
import "./styles.css";

export default function MyApp({ Component, pageProps }: AppProps) {
	return <Component {...pageProps} />;
}
