import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

type TabBarProps = {
  routes: { key: string, title: string }[];
  activeIndex: number;
  onNavigate: (index: number) => void;
};

export default function TabBar({ routes, activeIndex, onNavigate }: TabBarProps) {
  return (
    <View style={styles.bar}>
      {routes.map((r, idx) => (
        <TouchableOpacity
          key={r.key}
          style={[
            styles.tab,
            activeIndex === idx && styles.tabActive
          ]}
          onPress={() => onNavigate(idx)}
          activeOpacity={0.70}
        >
          <Text style={[
            styles.tabText,
            activeIndex === idx && styles.tabTextActive
          ]}>{r.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#e6f0fc',
    borderTopWidth: 1,
    borderColor: '#b5ccf1',
    paddingVertical: 8
  },
  tab: {
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  tabActive: {
    backgroundColor: '#3182ce'
  },
  tabText: {
    color: '#23578a',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold'
  },
  tabTextActive: {
    color: '#fff'
  }
});