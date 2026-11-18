using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


builder.Services.AddDbContext<ShopContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddStackExchangeRedisCache(options =>
    options.Configuration = builder.Configuration["Redis:Connection"] ?? "localhost:6379");

builder.Services.AddSingleton<EventPublisher>();

var app = builder.Build();

// Применяем миграции при старте: таблицы создаются сами
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<ShopContext>().Database.Migrate();
}

app.UseSwagger();
app.UseSwaggerUI();
app.MapControllers();
app.Run();