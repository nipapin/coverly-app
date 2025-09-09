"use client";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { useEffect, useState } from "react";

function Loading({ children, template }) {
	const { setTemplate } = useTemplateStore();
	const [isTemplateLoaded, setIsTemplateLoaded] = useState(false);

	useEffect(() => {
		if (template && template.layers) {
			setTemplate(template);
			setIsTemplateLoaded(true);
		} else {
			console.warn("Invalid template structure:", template);
		}
	}, [template, setTemplate]);

	// Show loading state until template is properly loaded
	if (!isTemplateLoaded || !template) {
		return null;
	}

	return <>{children}</>;
}

export default Loading;
