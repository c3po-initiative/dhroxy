package dhroxy.config

import io.netty.channel.ChannelOption
import io.netty.handler.timeout.ReadTimeoutHandler
import io.netty.handler.timeout.WriteTimeoutHandler
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.client.reactive.ReactorClientHttpConnector
import org.springframework.web.reactive.function.client.WebClient
import reactor.netty.http.client.HttpClient
import java.util.concurrent.TimeUnit

@Configuration
class WebClientConfig(private val props: SundhedClientProperties) {

    @Bean
    fun sundhedWebClient(builder: WebClient.Builder): WebClient {
        val httpClient = HttpClient.create()
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, props.connectTimeout.toMillis().toInt())
            .responseTimeout(props.readTimeout)
            .doOnConnected { conn ->
                val timeoutMs = props.readTimeout.toMillis()
                conn.addHandlerLast(ReadTimeoutHandler(timeoutMs, TimeUnit.MILLISECONDS))
                conn.addHandlerLast(WriteTimeoutHandler(timeoutMs, TimeUnit.MILLISECONDS))
            }

        return builder
            .baseUrl(props.baseUrl)
            .clientConnector(ReactorClientHttpConnector(httpClient))
            .build()
    }
}
