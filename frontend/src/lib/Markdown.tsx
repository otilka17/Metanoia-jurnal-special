import React from "react";
import { Text, View, StyleSheet, TextStyle } from "react-native";
import { theme } from "@/src/lib/theme";

type Props = { text: string; style?: TextStyle };

/**
 * Minimal markdown renderer for AI answers.
 * Supports: **bold**, - bullets, blank lines (paragraph spacing).
 * Does NOT support: headings, links, images, tables (kept simple/safe).
 */
export function Markdown({ text, style }: Props) {
  if (!text) return null;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactElement[] = [];
  let key = 0;

  const renderInline = (line: string, k: string) => {
    // Split by **bold** while keeping delimiters
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <Text key={k} style={[styles.para, style]}>
        {parts.map((p, i) => {
          if (p.startsWith("**") && p.endsWith("**")) {
            return <Text key={i} style={styles.bold}>{p.slice(2, -2)}</Text>;
          }
          return <Text key={i}>{p}</Text>;
        })}
      </Text>
    );
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      // blank line = paragraph gap
      blocks.push(<View key={`sp-${key++}`} style={styles.gap} />);
      continue;
    }
    if (/^-\s+/.test(line)) {
      // bullet
      const content = line.replace(/^-\s+/, "");
      const parts = content.split(/(\*\*[^*]+\*\*)/g);
      blocks.push(
        <View key={`b-${key++}`} style={styles.bulletRow}>
          <Text style={[styles.bullet, style]}>•</Text>
          <Text style={[styles.para, style, { flex: 1 }]}>
            {parts.map((p, i) => {
              if (p.startsWith("**") && p.endsWith("**")) {
                return <Text key={i} style={styles.bold}>{p.slice(2, -2)}</Text>;
              }
              return <Text key={i}>{p}</Text>;
            })}
          </Text>
        </View>
      );
      continue;
    }
    blocks.push(renderInline(line, `p-${key++}`));
  }
  return <View>{blocks}</View>;
}

const styles = StyleSheet.create({
  para: { fontSize: 14, color: theme.colors.textPrimary, lineHeight: 21 },
  bold: { fontWeight: "700", color: theme.colors.textPrimary },
  gap: { height: 8 },
  bulletRow: { flexDirection: "row", gap: 6, marginBottom: 2 },
  bullet: { fontSize: 14, color: theme.colors.primary, lineHeight: 21, fontWeight: "700" },
});
