/**
 * @license GPL-3.0
 * Copyright (C) 2024-2025 SilverHack3d <silverhack3d@gmail.com>
 */

import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/navigation";
import type { ProfileData } from "@/config";
import { ClientTweetCard } from "@/components/magicui/client-tweet-card";

export default function Profile() {
	const [error, setError] = useState<string>();
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [profileData, setProfileData] = useState<ProfileData | null>(null);
	const [tweetId, setTweetId] = useState<string | null>(null);
	const [isHovered, setIsHovered] = useState(false);
	const router = useRouter();

	const handleLogout = async () => {
		await fetch("/api/auth/logout", { method: "POST" });
		router.replace("/");
	};

	useEffect(() => {
		setIsLoading(true);
		fetch("/api/profile/update", { method: "POST" })
			.then(async (res) => {
				if (!res.ok) {
					const data = await res.json();
					setError(data.error || "cannot change profile rn. try later");
					setProfileData(null);
					setTweetId(null);
					console.error("Profile update failed:", data.error);
				} else {
					const data = await res.json();
					setProfileData(data.profile);
					setTweetId(data.tweetId);
					setError(undefined);
					console.log("Profile update successful:", data);
				}
			})
			.catch((error) => {
				setError(error.message);
				setProfileData(null);
				setTweetId(null);
				console.error("Profile update fetch error:", error);
			})
			.finally(() => {
				setIsLoading(false);
			});
	}, []);

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-100 p-4">
			{isLoading ? (
				<h1 className="text-2xl font-semibold text-gray-700">
					Updating Profile...
				</h1>
			) : error ? (
				<h1 className="text-2xl font-semibold text-red-600">Error: {error}</h1>
			) : profileData ? (
				<div className="flex flex-col items-center gap-4">
					<h1 className="text-3xl font-bold text-green-600">
						Profile Updated!
					</h1>
					<div className="w-full max-w-md rounded-lg border border-gray-300 bg-white p-6 shadow-md">
						<p className="mb-2">
							<strong className="font-semibold">Name:</strong>{" "}
							{profileData.name}
						</p>
						<p className="mb-2">
							<strong className="font-semibold">Description:</strong>{" "}
							{profileData.description}
						</p>
						<p className="mb-2">
							<strong className="font-semibold">Location:</strong>{" "}
							{profileData.location || "N/A"}
						</p>
						<p className="mb-4">
							<strong className="font-semibold">URL: </strong>
							{profileData.url ? (
								<a
									href={profileData.url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-600 hover:underline"
								>
									{profileData.url}
								</a>
							) : (
								" N/A"
							)}
						</p>
						{tweetId && (
							<div className="mt-4 border-t border-gray-200 pt-4">
								<strong className="mb-2 block font-semibold">
									Posted Tweet:
								</strong>
								<ClientTweetCard id={tweetId} />
							</div>
						)}
					</div>
				</div>
			) : (
				<h1 className="text-2xl font-semibold text-gray-700">
					No profile data loaded
				</h1>
			)}
			<button
				type="button"
				onClick={handleLogout}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				className={`cursor-pointer rounded-full border-none px-5 py-2.5 text-base font-bold text-white transition-colors duration-200 ${isHovered ? "bg-sky-600" : "bg-sky-500"}`}
			>
				Logout
			</button>
		</div>
	);
}

export const getServerSideProps: GetServerSideProps = async (context) => {
	const { oauth_token } = context.req.cookies;

	if (!oauth_token) {
		return {
			redirect: {
				destination: "/",
				permanent: false,
			},
		};
	}

	return { props: {} };
};
