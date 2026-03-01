/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: [
    '@glp1/ui',
    '@glp1/shared',
    '@glp1/api',
    'tamagui',
    '@tamagui/core',
    '@tamagui/config',
    'react-native',
    'react-native-web',
  ],
}

module.exports = config
