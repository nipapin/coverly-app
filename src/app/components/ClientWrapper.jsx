"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useTemplateStore } from "@/app/stores/TemplateStore";

const MainCanvas = dynamic(() => import("./MainCanvas"), { ssr: false });

export default function ClientWrapper({ template }) {
	const { setTemplate } = useTemplateStore();

	useEffect(() => {
		setTemplate(template);
	}, [template]);

	return <MainCanvas />;
}
