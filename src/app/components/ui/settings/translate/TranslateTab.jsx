import { Translate } from "@mui/icons-material";
import { Box, Button, CircularProgress, MenuItem, Select, Typography } from "@mui/material";
import { useState } from "react";

const languages = [
    { id: "bn-BD", name: "Bengali" },
    { id: "zh-CN", name: "Chinese (China)" },
    { id: "zh-TW", name: "Chinese (Taiwan)" },
    { id: "hr-HR", name: "Croatian" },
    { id: "cs-CZ", name: "Czech" },
    { id: "nl-NL", name: "Dutch" },
    { id: "en-US", name: "English" },
    { id: "fil-PH", name: "Filipino" },
    { id: "fi-FI", name: "Finnish" },
    { id: "fr-FR", name: "French" },
    { id: "de-DE", name: "German" },
    { id: "el-GR", name: "Greek" },
    { id: "hi-IN", name: "Hindi" },
    { id: "id-ID", name: "Indonesian" },
    { id: "it-IT", name: "Italian" },
    { id: "ja-JP", name: "Japanese" },
    { id: "kk-KZ", name: "Kazakh" },
    { id: "ko-KR", name: "Korean" },
    { id: "ms-MY", name: "Malay" },
    { id: "no-NO", name: "Norwegian" },
    { id: "pl-PL", name: "Polish" },
    { id: "pt-PT", name: "Portuguese" },
    { id: "ro-RO", name: "Romanian" },
    { id: "ru-RU", name: "Russian" },
    { id: "sk-SK", name: "Slovak" },
    { id: "es-ES", name: "Spanish" },
    { id: "sv-SE", name: "Swedish" },
    { id: "ta-IN", name: "Tamil" },
    { id: "th-TH", name: "Thai" },
    { id: "tr-TR", name: "Turkish" },
    { id: "uk-UA", name: "Ukrainian" },
    { id: "vi-VN", name: "Vietnamese" },
];

export default function TranslateTab() {
    const [loading, setLoading] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState("en-US");

    const handleChangeLanguage = (event) => {
        setSelectedLanguage(event.target.value);
    };

    const handleTranslate = () => {
        setLoading(true);
        fetch("/api/gemini/translate", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                languages: [selectedLanguage],
                image: "",
            }),
        })
            .then(console.log)
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    return (
        <Box display="flex" flexDirection="column" gap="0.5rem">
            <Typography variant="h6" fontSize={"12px"}>
                Select language
            </Typography>
            <Select size="small" fullWidth value={selectedLanguage} onChange={handleChangeLanguage}>
                {languages.map((language, index) => (
                    <MenuItem key={language.id} value={language.id}>
                        {language.name}
                    </MenuItem>
                ))}
            </Select>
            <Button variant="contained" endIcon={loading ? <CircularProgress fontSize={16} /> : <Translate />} onClick={handleTranslate}>
                Translate
            </Button>
        </Box>
    );
}
