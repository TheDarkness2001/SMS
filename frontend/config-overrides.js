const { override, addWebpackAlias } = require('customize-cra');
const webpack = require('webpack');
const path = require('path');

module.exports = {
  webpack: override(
    (config, env) => {
      // Explicitly define the environment variable in webpack
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.env.REACT_APP_VAPID_PUBLIC_KEY': JSON.stringify(
            'BPgwsHTpITMJmQsdh7wpY8KQ59tgR4j5N9nYtLFtZDoRiNEcWv58F9gBm03uIvyGq_nDCSNnASvm-tjoQ0wGqmY'
          )
        })
      );
      
      return config;
    }
  ),
  devServer: (configFunction) => {
    return (proxy, allowedHost) => {
      const config = configFunction(proxy, allowedHost);
      
      // Fix allowedHosts to be a proper array
      config.allowedHosts = ['localhost', '127.0.0.1', '.localhost'];
      
      return config;
    };
  }
};