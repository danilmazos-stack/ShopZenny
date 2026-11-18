using System.Text;
using System.Text.Json;
using RabbitMQ.Client;

public class EventPublisher(IConfiguration config, ILogger<EventPublisher> logger) : IAsyncDisposable
{
    private const string QueueName = "product-events";
    private readonly SemaphoreSlim _lock = new(1, 1);
    private IConnection? _connection;
    private IChannel? _channel;

    private async Task<IChannel> GetChannelAsync()
    {
        if (_channel is { IsOpen: true }) return _channel;

        await _lock.WaitAsync();
        try
        {
            if (_channel is { IsOpen: true }) return _channel;

            var factory = new ConnectionFactory { HostName = config["RabbitMq:Host"] ?? "localhost" };
            _connection = await factory.CreateConnectionAsync();
            _channel = await _connection.CreateChannelAsync();
            await _channel.QueueDeclareAsync(QueueName, durable: true, exclusive: false, autoDelete: false);
            return _channel;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task PublishAsync(ProductEvent evt)
    {
        try
        {
            var channel = await GetChannelAsync();
            var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(evt));
            await channel.BasicPublishAsync(exchange: string.Empty, routingKey: QueueName, body: body);
        }
        catch (Exception ex)
        {
            // Если RabbitMQ недоступен, API продолжает работать
            logger.LogError(ex, "Не удалось отправить событие {Type}", evt.Type);
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_channel is not null) await _channel.DisposeAsync();
        if (_connection is not null) await _connection.DisposeAsync();
    }
}