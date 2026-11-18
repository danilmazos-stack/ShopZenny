using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

public record ProductEvent(string Type, int ProductId, string Name, decimal Price, DateTime AtUtc);

public class Worker(ILogger<Worker> logger, IConfiguration config) : BackgroundService
{
    private const string QueueName = "product-events";

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var factory = new ConnectionFactory { HostName = config["RabbitMq:Host"] ?? "localhost" };
        await using var connection = await factory.CreateConnectionAsync(stoppingToken);
        await using var channel = await connection.CreateChannelAsync(cancellationToken: stoppingToken);

        await channel.QueueDeclareAsync(QueueName, durable: true, exclusive: false,
            autoDelete: false, cancellationToken: stoppingToken);

        var consumer = new AsyncEventingBasicConsumer(channel);
        consumer.ReceivedAsync += async (_, ea) =>
        {
            var json = Encoding.UTF8.GetString(ea.Body.ToArray());
            var evt = JsonSerializer.Deserialize<ProductEvent>(json);

            logger.LogInformation("Событие {Type}: товар #{Id} \"{Name}\", цена {Price}",
                evt?.Type, evt?.ProductId, evt?.Name, evt?.Price);

            // Подтверждаем, что сообщение обработано, и RabbitMQ удалит его из очереди
            await channel.BasicAckAsync(ea.DeliveryTag, multiple: false, cancellationToken: stoppingToken);
        };

        await channel.BasicConsumeAsync(QueueName, autoAck: false, consumer: consumer,
            cancellationToken: stoppingToken);

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }
}