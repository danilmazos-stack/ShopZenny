using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

[ApiController]
[Route("api/[controller]")]
public class ProductsController(ShopContext db, IDistributedCache cache, EventPublisher events) : ControllerBase
{
    private const string CacheKey = "products:all";

    // Пропускаем только http(s)-адреса и пути вида /images/...
private static string? CleanUrl(string? url)
{
    url = url?.Trim();
    if (string.IsNullOrEmpty(url)) return null;
    return url.StartsWith("https://") || url.StartsWith("http://") || url.StartsWith("/") ? url : null;
}

    // GET /api/products: сначала смотрим в Redis, потом в базу
    [HttpGet]
    public async Task<ActionResult<List<Product>>> GetAll()
    {
        var cached = await cache.GetStringAsync(CacheKey);
        if (cached is not null)
        {
            Response.Headers["X-Cache"] = "HIT";
            return Ok(JsonSerializer.Deserialize<List<Product>>(cached));
        }

        var products = await db.Products.AsNoTracking().OrderBy(p => p.Id).ToListAsync();
        await cache.SetStringAsync(CacheKey, JsonSerializer.Serialize(products),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1) });

        Response.Headers["X-Cache"] = "MISS";
        return Ok(products);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Product>> GetById(int id)
    {
        var product = await db.Products.FindAsync(id);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpPost]
    public async Task<ActionResult<Product>> Create(ProductDto dto)
    {
        var product = new Product { Name = dto.Name, Price = dto.Price, ImageUrl = CleanUrl(dto.ImageUrl) };        db.Products.Add(product);
        await db.SaveChangesAsync();

        await cache.RemoveAsync(CacheKey);
        await events.PublishAsync(new ProductEvent("Created", product.Id, product.Name, product.Price, DateTime.UtcNow));

        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, ProductDto dto)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null) return NotFound();

        product.Name = dto.Name;
        product.Price = dto.Price;
        product.ImageUrl = CleanUrl(dto.ImageUrl);
        await db.SaveChangesAsync();

        await cache.RemoveAsync(CacheKey);
        await events.PublishAsync(new ProductEvent("Updated", product.Id, product.Name, product.Price, DateTime.UtcNow));

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null) return NotFound();

        db.Products.Remove(product);
        await db.SaveChangesAsync();

        await cache.RemoveAsync(CacheKey);
        await events.PublishAsync(new ProductEvent("Deleted", product.Id, product.Name, product.Price, DateTime.UtcNow));

        return NoContent();
    }
}