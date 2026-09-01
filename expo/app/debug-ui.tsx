import { Calendar, Plus, Search, Star, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme, type ThemeMode } from "@/hooks/use-theme";
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  IconButton,
  Input,
  Screen,
  SegmentedControl,
  SkeletonCard,
  Text,
} from "@/components/ui";

// Dev-only visual catalogue of every UI primitive, for QA in light + dark.
// Not linked anywhere; open /debug-ui directly.
export default function DebugUI() {
  const { theme, mode, setMode } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [seg, setSeg] = useState("feed");

  // Dev-only catalogue — inert in production builds.
  if (!__DEV__) return null;

  return (
    <Screen scroll maxWidth="content" padded={6}>
      <Text variant="display">Design system</Text>
      <Text variant="body" color="secondary">
        Scheme: {theme.scheme}
      </Text>

      <View style={styles.section}>
        <SegmentedControl<ThemeMode>
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          value={mode}
          onChange={setMode}
        />
      </View>

      <Text variant="h2" style={styles.h}>
        Type scale
      </Text>
      <Card>
        <Text variant="display">Display</Text>
        <Text variant="h1">Heading 1</Text>
        <Text variant="h2">Heading 2</Text>
        <Text variant="h3">Heading 3</Text>
        <Text variant="title">Title</Text>
        <Text variant="body">Body — the quick brown fox jumps over the lazy dog.</Text>
        <Text variant="bodySm" color="secondary">
          Body small / secondary
        </Text>
        <Text variant="label" color="muted">
          LABEL / MUTED
        </Text>
        <Text variant="caption" color="muted">
          Caption
        </Text>
      </Card>

      <Text variant="h2" style={styles.h}>
        Buttons
      </Text>
      <View style={styles.row}>
        <Button label="Primary" onPress={() => {}} />
        <Button label="Secondary" variant="secondary" onPress={() => {}} />
        <Button label="Ghost" variant="ghost" onPress={() => {}} />
        <Button label="Danger" variant="danger" onPress={() => {}} />
      </View>
      <View style={styles.row}>
        <Button label="Small" size="sm" onPress={() => {}} />
        <Button label="Medium" size="md" onPress={() => {}} />
        <Button label="Large" size="lg" onPress={() => {}} />
        <Button label="Loading" loading onPress={() => {}} />
        <Button label="Disabled" disabled onPress={() => {}} />
      </View>
      <View style={styles.row}>
        <Button
          label="With icon"
          leftIcon={<Plus size={16} color={theme.textOnAccent} />}
          onPress={() => {}}
        />
        <IconButton label="fav" variant="surface">
          <Star size={18} color={theme.textSecondary} />
        </IconButton>
        <IconButton label="plan" variant="accent">
          <Calendar size={18} color={theme.accent} />
        </IconButton>
        <IconButton label="del">
          <Trash2 size={18} color={theme.danger} />
        </IconButton>
      </View>

      <Text variant="h2" style={styles.h}>
        Badges
      </Text>
      <View style={styles.row}>
        <Badge label="Neutral" />
        <Badge label="Accent" tone="accent" />
        <Badge label="Success" tone="success" />
        <Badge label="Warning" tone="warning" />
        <Badge label="Danger" tone="danger" />
        <Badge label="★ 4.5" tone="star" />
        <Badge label="Solid" tone="accent" solid />
      </View>

      <Text variant="h2" style={styles.h}>
        Inputs
      </Text>
      <Card>
        <Input label="Label" placeholder="Placeholder text" />
        <View style={{ height: 12 }} />
        <Input
          search
          placeholder="Search…"
          leftIcon={<Search size={16} color={theme.textMuted} />}
        />
        <View style={{ height: 12 }} />
        <Input label="With error" value="bad" error="That doesn't look right" />
      </Card>

      <Text variant="h2" style={styles.h}>
        Segmented control
      </Text>
      <SegmentedControl
        options={[
          { value: "feed", label: "Feed" },
          { value: "friends", label: "Friends", badge: 3 },
          { value: "inbox", label: "Inbox" },
        ]}
        value={seg}
        onChange={setSeg}
      />

      <Text variant="h2" style={styles.h}>
        Card + Divider
      </Text>
      <Card raised>
        <Text variant="title">Raised card</Text>
        <Text variant="bodySm" color="secondary">
          Subtle neutral shadow, hairline border.
        </Text>
        <Divider spacing={4} />
        <Text variant="bodySm" color="secondary">
          Content below the divider.
        </Text>
      </Card>

      <Text variant="h2" style={styles.h}>
        Skeleton
      </Text>
      <SkeletonCard />

      <Text variant="h2" style={styles.h}>
        Empty state
      </Text>
      <Card padding={0}>
        <EmptyState
          icon={<Star size={24} color={theme.textMuted} />}
          title="Nothing here yet"
          description="When you add something it'll show up in this list."
          action={{ label: "Add the first one", onPress: () => {} }}
        />
      </Card>

      <View style={{ height: 60 }} />
    </Screen>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    section: { marginTop: t.space[5] },
    h: { marginTop: t.space[8], marginBottom: t.space[4] },
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: t.space[3],
      marginBottom: t.space[3],
    },
  });
