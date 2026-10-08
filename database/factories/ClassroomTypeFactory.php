<?php

namespace Database\Factories;

use App\Models\ClassroomType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClassroomType>
 */
class ClassroomTypeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true),
            'description' => fake()->optional()->sentence(),
            'active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(['active' => false]);
    }
}
