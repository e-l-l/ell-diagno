import { Link } from "expo-router";
import { Button, Text, View } from "react-native";
const names = ["Mr. Amit", "Mrs. Sheela", "Mr. Rajesh"];
export default function HomeScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 20 }}>
        Hurry, {names[Math.floor(Math.random() * names.length)]} needs a
        diagnosis!
      </Text>
      <Link href="/chat" asChild>
        <Button title="Start diagnosis" />
      </Link>
    </View>
  );
}
