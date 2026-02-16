export function generatePackageJson(pageName: string): string {
  return JSON.stringify(
    {
      name: pageName,
      version: '1.0.0',
      private: true,
      scripts: {
        'build:weapp': 'taro build --type weapp',
        'dev:weapp': 'taro build --type weapp --watch',
        'build:h5': 'taro build --type h5',
        'dev:h5': 'taro build --type h5 --watch',
      },
      dependencies: {
        '@tarojs/cli': '4.0.9',
        '@tarojs/components': '4.0.9',
        '@tarojs/helper': '4.0.9',
        '@tarojs/plugin-framework-react': '4.0.9',
        '@tarojs/plugin-platform-h5': '4.0.9',
        '@tarojs/plugin-platform-weapp': '4.0.9',
        '@tarojs/react': '4.0.9',
        '@tarojs/runtime': '4.0.9',
        '@tarojs/shared': '4.0.9',
        '@tarojs/taro': '4.0.9',
        react: '^18.3.0',
        'react-dom': '^18.3.0',
        sass: '^1.80.0',
      },
      devDependencies: {
        '@types/react': '^18.3.0',
        typescript: '^5.4.0',
      },
    },
    null,
    2,
  )
}
