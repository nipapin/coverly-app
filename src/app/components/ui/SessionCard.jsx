import { Layers } from "@mui/icons-material";
import { Card, CardActionArea, CardHeader, CardMedia } from "@mui/material";
import NextLink from "next/link";

const placeholderImage =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/960px-Placeholder_view_vector.svg.png";

export default function SessionCard({ session }) {
  return (
    <Card sx={{ "& a": { textDecoration: "none", color: "inherit" } }}>
      <NextLink href={`/workflow/${session.sessionId}`} passHref>
        <CardActionArea>
          <CardMedia
            image={session.thumbnail || placeholderImage}
            alt={"project preview"}
            sx={{ width: "100%", height: "auto", aspectRatio: "16/9" }}
          />
          <CardHeader title={session.customName || "Untitled"} subheader={session.createdAt} avatar={<Layers />} />
        </CardActionArea>
      </NextLink>
    </Card>
  );
}
