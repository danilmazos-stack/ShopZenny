public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
}

// То, что клиент присылает при создании и изменении
public record ProductDto(string Name, decimal Price);

// Событие, которое уходит в RabbitMQ
public record ProductEvent(string Type, int ProductId, string Name, decimal Price, DateTime AtUtc);