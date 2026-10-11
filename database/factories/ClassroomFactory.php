<?php

namespace Database\Factories;

use App\Models\Classroom;
use App\Models\ClassroomType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Classroom>
 */
class ClassroomFactory extends Factory
{
    public function definition(): array
    {
        $name = strtoupper(fake()->bothify('??#-?'));

        return [
            'name' => $name,
            'code' => strtoupper(fake()->unique()->bothify('??##')),
            'capacity' => fake()->numberBetween(20, 50),
            'active' => true,
            'classroom_type_id' => null,
        ];
    }

    public function withType(): static
    {
        return $this->state(function () {
            return ['classroom_type_id' => ClassroomType::factory()];
        });
    }

    public function inactive(): static
    {
        return $this->state(['active' => false]);
    }
}
