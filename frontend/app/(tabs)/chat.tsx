// app/(tabs)/chat.tsx
import { useState } from "react";
import { Button, FlatList, Text, TextInput, View } from "react-native";

export default function ChatScreen() {
  const [messages, setMessages] = useState([
    {
      id: "1",
      from: "doctor",
      text: "Hi Doctor! Here's your patient: fever, cough, and fatigue.",
    },
  ]);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      from: "you",
      text: input.trim(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              alignSelf: item.from === "you" ? "flex-end" : "flex-start",
              backgroundColor: item.from === "you" ? "#007aff" : "#e0e0e0",
              borderRadius: 10,
              padding: 10,
              marginVertical: 4,
              maxWidth: "80%",
            }}
          >
            <Text style={{ color: item.from === "you" ? "#fff" : "#000" }}>
              {item.text}
            </Text>
          </View>
        )}
      />

      <View style={{ flexDirection: "row", marginTop: 12 }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          style={{
            flex: 1,
            borderColor: "#ccc",
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 10,
            marginRight: 8,
          }}
        />
        <Button title="Send" onPress={sendMessage} />
      </View>
    </View>
  );
}
