/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 **/
import { Server } from 'hapi';
import { environment } from './environments/environment'

const axios = require('axios');
const NodeCache = require( "node-cache" );
const cache = new NodeCache();

const init = async () => {
  const server = new Server({
    port: 3333,
    host: 'localhost'
  });

  server.route({
    method: 'GET',
    path: '/beta/stock/{symbol}/chart/{period}',
    handler: async (request, reply) => {
      const symbol: string = request.params.symbol;
      const period: string = request.params.period;
      const cacheKey: string = "UID-" + symbol + "-" + period;
      const apiUrl: string = environment.apiURL.replace('{symbol}', symbol).replace('{period}', period) + environment.apiKey;

      if (cache.has(cacheKey)) {
        return reply.response(cache.get(cacheKey));
      } else {
        const httpResponse = await axios.get(apiUrl)
          .catch((err = new Error()) => {
            return reply.response('Error').code(500);
          });

        cache.set(cacheKey, httpResponse.data, 10000 );
        return reply.response(httpResponse.data);
      }
    }
  });

  await server.start();
  console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', err => {
  console.log(err);
  process.exit(1);
});

init();
