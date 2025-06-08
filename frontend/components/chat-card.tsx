import { StyleSheet, Text, View, Pressable } from 'react-native'
import React from 'react'

interface CaseCardProps {
  title: string;
  onPress?: () => void;
}

const CaseCard = ({ title, onPress }: CaseCardProps) => {
  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
      </View>
    </Pressable>
  )
}

export default CaseCard

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  }
})