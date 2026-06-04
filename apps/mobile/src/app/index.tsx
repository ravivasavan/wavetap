import { Button, Text } from 'heroui-native';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * WaveTap home — first HeroUI Native screen, themed by @wavetap/tokens
 * (native-theme.css). Mirrors the web holding page; proves the shared design
 * language renders on native with the same brand tokens.
 */
export default function HomeScreen() {
  return (
    <SafeAreaView className="bg-background flex-1">
      <View className="flex-1 items-center justify-center gap-4 px-6">
        <Text className="text-muted text-sm uppercase tracking-widest">WaveTap</Text>
        <Text className="text-foreground text-center text-4xl font-semibold">Wave. Tap. Book.</Text>
        <Text className="text-muted max-w-sm text-center text-base">
          A neutral, peer-to-peer way to connect with Auslan interpreters. No agencies, no
          middlemen — just match, then hand off.
        </Text>
        <Button onPress={() => {}}>Get started</Button>
      </View>
    </SafeAreaView>
  );
}
