public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? ImageUrl { get; set; }
}

public record ProductDto(string Name, decimal Price, string? ImageUrl = null);

// Событие, которое уходит в RabbitMQ
public record ProductEvent(string Type, int ProductId, string Name, decimal Price, DateTime AtUtc);