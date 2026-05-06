"use client";

import { safeNextPath } from "@/lib/safeNextPath";
import { Alert, Box, Button, Container, Paper, TextField, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [email, setEmail] = useState("");
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const res = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				setError(typeof data.error === "string" ? data.error : "Could not sign in.");
				return;
			}
			const nextRaw = searchParams.get("next");
			router.replace(safeNextPath(nextRaw));
			router.refresh();
		} catch {
			setError("Something went wrong. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Box
			sx={{
				minHeight: "100vh",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				p: 2,
			}}
		>
			<Container maxWidth="sm">
				<Paper elevation={2} sx={{ p: 4 }}>
					<Typography variant='h5' component='h1' gutterBottom fontWeight={600}>
						Sign in
					</Typography>
					<Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
						Enter your corporate email to continue.
					</Typography>
					<Box component='form' onSubmit={handleSubmit}>
						<TextField
							fullWidth
							type='email'
							autoComplete='email'
							label='Work email'
							placeholder='you@company.com'
							value={email}
							onChange={(ev) => setEmail(ev.target.value)}
							margin='normal'
							required
							disabled={loading}
						/>
						{error ? (
							<Alert severity='error' sx={{ mt: 2 }}>
								{error}
							</Alert>
						) : null}
						<Button type='submit' fullWidth variant='contained' sx={{ mt: 3 }} disabled={loading}>
							{loading ? "Signing in…" : "Continue"}
						</Button>
					</Box>
				</Paper>
			</Container>
		</Box>
	);
}
